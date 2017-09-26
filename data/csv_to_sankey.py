#!/usr/bin/python
import csv
import json


# Define the data to read in and the columns in the CSV files to link
# the nodes based on
DATA_FILES = [
    {
        'path': 'Interview_Data_Clean_Consolidated.csv',
        'output': 'Descriptive.json',
        'columns': ['ID', 'DH/DM', 'LEVEL', 'SOURCE', 'ELEMENT', 'FREQUENCY']
    },
    {
        'path': 'Interview_Data_Clean_Consolidated_DM_Only.csv',
        'output': 'Critical-Decisions.json',
        'columns': ['ID', 'LEVEL', 'DECISION', 'ELEMENT', 'SOURCE', 'GOAL']
    },
    {
        'path': 'Interview_Data_Clean_Consolidated_DM_Only.csv',
        'output': 'Critical-data-for-decisions.json',
        'columns': ['GOAL', 'DECISION', 'LEVEL', 'ELEMENT', 'SOURCE']
    },
    {
        'path': 'Interview_Data_Clean_Consolidated.csv',
        'output': 'Access-to-info.json',
        'columns': ['LEVEL', 'SOURCE TYPE', 'GOAL']
    }
]


def convert_data(datafile):
    data = {'nodes': [], 'links': []}
    print 'Extracting columns', datafile['columns']

    node_indices = {}
    with open(datafile['path'], 'r') as f:
        reader = csv.DictReader(f)
        # For each row, want to emit a node for every column
        for row in reader:
            previous_node = None
            for column in datafile['columns']:
                # Create data structure expected by d3
                node = {'group': column, 'name': row[column]}

                # Keep track of what we've added, so we don't duplicate
                # nodes. Have to manually construct hash as we cannot index
                # with a dict directly
                node_hash = '%s#####%s' % (column, row[column])
                if node_hash not in node_indices:
                    node_indices[node_hash] = len(data['nodes'])
                    data['nodes'].append(node)

                # Create link between us and previous node
                if previous_node is not None:
                    link = {
                        'source': node_indices[previous_node],
                        'target': node_indices[node_hash],
                        'value': 1
                    }
                    data['links'].append(link)
                previous_node = node_hash

    return data


def standalone():
    for datafile in DATA_FILES:
        print 'Processing', datafile['path']
        data = convert_data(datafile)
        print 'Wrting output to', datafile['output']
        with open(datafile['output'], 'w') as f:
            json.dump(data, f)


if __name__ == '__main__':
    standalone()
